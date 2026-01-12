import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { updateEntityStatus } from "@/lib/statusEngine";

/**
 * PUT /api/documents/[id]/extraction
 * 
 * Update document extraction (for manual review/editing)
 */
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
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", params.id)
      .eq("fleet_id", fleet.id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { extracted_json } = body;

    if (!extracted_json) {
      return NextResponse.json(
        { error: "extracted_json is required" },
        { status: 400 }
      );
    }

    // Get or create extraction record
    const { data: existingExtraction } = await supabase
      .from("document_extractions")
      .select("id")
      .eq("document_id", params.id)
      .single();

    if (existingExtraction) {
      // Update existing extraction
      const { error: updateError } = await supabase
        .from("document_extractions")
        .update({
          extracted_json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingExtraction.id);

      if (updateError) {
        return NextResponse.json(
          { error: `Failed to update extraction: ${updateError.message}` },
          { status: 500 }
        );
      }
    } else {
      // Create new extraction
      const { error: insertError } = await supabase
        .from("document_extractions")
        .insert({
          document_id: params.id,
          doc_type: document.doc_type,
          extracted_json,
          raw_text: null,
          confidence: {},
        });

      if (insertError) {
        return NextResponse.json(
          { error: `Failed to create extraction: ${insertError.message}` },
          { status: 500 }
        );
      }
    }

    // Update document with expiration date from extraction
    const expirationDate = extracted_json.expiration_date || null;
    const updates: any = {
      expiration_date: expirationDate,
      expires_on: expirationDate, // Backward compatibility
      processing_status: "complete",
      needs_review: false,
    };

    // Recalculate compliance status based on expiration
    if (expirationDate) {
      const expiration = new Date(expirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysUntilExpiration = Math.ceil(
        (expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiration < 0) {
        updates.status = "red"; // Expired
      } else if (daysUntilExpiration <= 30) {
        updates.status = "yellow"; // Expiring soon
      } else {
        updates.status = "green";
      }
    }

    await supabase
      .from("documents")
      .update(updates)
      .eq("id", params.id);

    // Recalculate entity status
    try {
      await updateEntityStatus(
        document.entity_type as "driver" | "vehicle",
        document.entity_id,
        fleet.id
      );
    } catch (statusError) {
      console.error("Failed to recalculate entity status:", statusError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update extraction error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
