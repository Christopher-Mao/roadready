import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { deleteFile, getSignedUrl } from "@/lib/storage";
import { updateEntityStatus } from "@/lib/statusEngine";

// GET /api/documents/[id] - Get document with signed URL
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's fleet
    const { data: fleet } = await supabase
      .from("fleets")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!fleet) {
      return NextResponse.json(
        { error: "Fleet not found" },
        { status: 404 }
      );
    }

    // Get document
    const { data: document, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", params.id)
      .eq("fleet_id", fleet.id)
      .single();

    if (error || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Generate signed URL for file access
    try {
      const signedUrl = await getSignedUrl(document.file_path, 3600); // 1 hour expiry
      return NextResponse.json({ ...document, signed_url: signedUrl });
    } catch (urlError: any) {
      return NextResponse.json(
        { ...document, signed_url: null, url_error: urlError.message },
      );
    }
  } catch (error: any) {
    console.error("Get document error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/documents/[id] - Update document metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's fleet
    const { data: fleet } = await supabase
      .from("fleets")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!fleet) {
      return NextResponse.json(
        { error: "Fleet not found" },
        { status: 404 }
      );
    }

    // Get document
    const { data: existingDoc, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", params.id)
      .eq("fleet_id", fleet.id)
      .single();

    if (fetchError || !existingDoc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { docType, expiresOn } = body;

    // Prepare update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (docType !== undefined) {
      updates.doc_type = docType;
    }

    if (expiresOn !== undefined) {
      updates.expires_on = expiresOn || null;

      // Recalculate status based on expiration date
      if (expiresOn) {
        const expirationDate = new Date(expiresOn);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysUntilExpiration = Math.ceil(
          (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiration < 0) {
          updates.status = "red"; // Expired
        } else if (daysUntilExpiration <= 30) {
          updates.status = "yellow"; // Expiring soon
        } else {
          updates.status = "green";
        }
      } else {
        // No expiration date = green status
        updates.status = "green";
      }
    }

    // Update document
    const { data: document, error: updateError } = await supabase
      .from("documents")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update document: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Recalculate entity status based on all documents
    try {
      await updateEntityStatus(
        existingDoc.entity_type as "driver" | "vehicle",
        existingDoc.entity_id,
        fleet.id
      );
    } catch (statusError) {
      // Log but don't fail - document was updated successfully
      console.error("Failed to recalculate entity status:", statusError);
    }

    return NextResponse.json({ document });
  } catch (error: any) {
    console.error("Update document error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's fleet
    const { data: fleet } = await supabase
      .from("fleets")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!fleet) {
      return NextResponse.json(
        { error: "Fleet not found" },
        { status: 404 }
      );
    }

    // Get document (to get file path)
    const { data: document, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", params.id)
      .eq("fleet_id", fleet.id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete file from storage
    try {
      await deleteFile(document.file_path);
    } catch (storageError: any) {
      // Log but continue - document record should still be deleted
      console.error("Failed to delete file from storage:", storageError);
    }

    // Delete document record
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", params.id);

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete document: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // Recalculate entity status based on remaining documents
    try {
      await updateEntityStatus(
        document.entity_type as "driver" | "vehicle",
        document.entity_id,
        fleet.id
      );
    } catch (statusError) {
      // Log but don't fail - document was deleted successfully
      console.error("Failed to recalculate entity status:", statusError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
