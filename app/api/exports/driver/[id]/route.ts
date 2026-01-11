import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getSignedUrl } from "@/lib/storage";

/**
 * GET /api/exports/driver/[id]
 * 
 * Export driver compliance packet (CSV + document list with timestamps)
 */
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

    // Get driver
    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", params.id)
      .eq("fleet_id", fleet.id)
      .single();

    if (driverError || !driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    // Get driver documents
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .eq("fleet_id", fleet.id)
      .eq("entity_type", "driver")
      .eq("entity_id", params.id)
      .order("uploaded_at", { ascending: false });

    if (docsError) {
      return NextResponse.json(
        { error: `Failed to fetch documents: ${docsError.message}` },
        { status: 500 }
      );
    }

    // Generate signed URLs for documents
    const documentsWithUrls = await Promise.all(
      (documents || []).map(async (doc) => {
        try {
          const signedUrl = await getSignedUrl(doc.file_path, 3600); // 1 hour
          return {
            ...doc,
            download_url: signedUrl,
          };
        } catch (error) {
          return {
            ...doc,
            download_url: null,
            url_error: "Failed to generate download link",
          };
        }
      })
    );

    // Create CSV content
    const csvRows = [
      // Header
      [
        "Driver Information",
        "Value",
        "Timestamp",
      ],
      // Driver data
      ["Driver ID", driver.id, new Date().toISOString()],
      ["Name", driver.name || "", driver.created_at || ""],
      ["Email", driver.email || "", driver.updated_at || ""],
      ["Phone", driver.phone || "", ""],
      ["CDL Number", driver.cdl_number || "", ""],
      ["Status", driver.status.toUpperCase(), ""],
      // Empty row
      [],
      // Documents header
      [
        "Document Type",
        "Expiration Date",
        "Status",
        "Uploaded At",
        "Uploaded By",
        "File Path",
      ],
      // Document rows
      ...(documents || []).map((doc) => [
        doc.doc_type || "",
        doc.expires_on ? new Date(doc.expires_on).toLocaleDateString() : "No expiration",
        doc.status.toUpperCase(),
        new Date(doc.uploaded_at).toISOString(),
        doc.uploaded_by || "",
        doc.file_path || "",
      ]),
    ];

    // Convert to CSV string
    const csvContent = csvRows
      .map((row) =>
        row
          .map((cell) => {
            // Escape commas and quotes
            const cellStr = String(cell || "");
            if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(",")
      )
      .join("\n");

    // Create export packet
    const exportPacket = {
      export_date: new Date().toISOString(),
      driver: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        cdl_number: driver.cdl_number,
        status: driver.status,
        created_at: driver.created_at,
        updated_at: driver.updated_at,
      },
      documents: documentsWithUrls.map((doc) => ({
        id: doc.id,
        doc_type: doc.doc_type,
        expires_on: doc.expires_on,
        status: doc.status,
        uploaded_at: doc.uploaded_at,
        uploaded_by: doc.uploaded_by,
        download_url: doc.download_url,
        file_path: doc.file_path,
      })),
      csv: csvContent,
      summary: {
        total_documents: (documents || []).length,
        expired_documents: (documents || []).filter(
          (d) => d.status === "red" && d.expires_on && new Date(d.expires_on) < new Date()
        ).length,
        expiring_soon_documents: (documents || []).filter(
          (d) => d.status === "yellow"
        ).length,
        valid_documents: (documents || []).filter((d) => d.status === "green").length,
      },
    };

    return NextResponse.json(exportPacket);
  } catch (error: any) {
    console.error("Export driver error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
