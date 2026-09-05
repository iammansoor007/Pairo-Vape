import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import ProductProcess from "@/models/ProductProcess";
import { can } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!can(session.user, "products.view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    let process = await ProductProcess.findOne({ key: "global" }).lean();
    
    if (!process) {
      process = await ProductProcess.create({
        key: "global",
        title: "Quality & Testing Process",
        subtitle: "How we ensure pure flavor & authentic performance",
        steps: []
      });
    }

    return NextResponse.json(process);
  } catch (error) {
    console.error("GET Product Process Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!can(session.user, "products.edit")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, subtitle, steps } = body;

    await dbConnect();
    const updated = await ProductProcess.findOneAndUpdate(
      { key: "global" },
      {
        $set: {
          title: title || "Our Craftsmanship Process",
          subtitle: subtitle || "",
          steps: steps || []
        }
      },
      { new: true, upsert: true }
    );

    await logAction({
      userId: session.user.id,
      action: "UPDATE_PRODUCT_PROCESS",
      targetType: "SiteConfig",
      targetId: updated._id,
      details: { title, subtitle, stepsCount: steps?.length || 0 }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT Product Process Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
