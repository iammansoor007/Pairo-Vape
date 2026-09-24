import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing route
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/app/api/auth/[...nextauth]/route", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db", () => ({
  default: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/rbac", () => ({
  can: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/mediaUsage", () => ({
  trackMediaUsage: vi.fn().mockResolvedValue(true),
  findMediaByUrl: vi.fn().mockResolvedValue(null),
}));

const {
  mockFind,
  mockFindOne,
  mockCreate,
  mockFindOneAndUpdate,
  mockUpdateMany,
  mockCategoryFind,
} = vi.hoisted(() => ({
  mockFind: vi.fn(),
  mockFindOne: vi.fn(),
  mockCreate: vi.fn(),
  mockFindOneAndUpdate: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockCategoryFind: vi.fn(),
}));

vi.mock("@/models/Product", () => ({
  default: {
    find: mockFind,
    findOne: mockFindOne,
    create: mockCreate,
    findOneAndUpdate: mockFindOneAndUpdate,
    updateMany: mockUpdateMany,
  },
}));

vi.mock("@/models/Category", () => ({
  default: {
    find: mockCategoryFind,
  },
}));

// Import route handlers
import { GET, POST } from "@/app/api/admin/products/bulk/route";
import { getServerSession } from "next-auth";
import { can } from "@/lib/rbac";

describe("🛡️ BULK API ROUTE INTEGRATION AUDIT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default valid session
    getServerSession.mockResolvedValue({
      user: { isStaff: true, id: "staff-1", role: { slug: "super-admin" } },
    });
    can.mockReturnValue(true);
    mockFindOne.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: "660c1f2e8b1d9c001f3a5e20", stock: 10, images: ["img.jpg"] }),
      }),
      lean: vi.fn().mockResolvedValue({ _id: "660c1f2e8b1d9c001f3a5e20", stock: 10, images: ["img.jpg"] }),
    });
    mockCategoryFind.mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { _id: "660c1f2e8b1d9c001f3a5e01", name: "Disposables", slug: "disposables" },
          ]),
        }),
      }),
      lean: vi.fn().mockResolvedValue([
        { _id: "660c1f2e8b1d9c001f3a5e01", name: "Disposables", slug: "disposables" },
      ]),
    });
  });

  // =========================================================================
  // 1. AUTH & PERMISSIONS GATEKEEPING
  // =========================================================================
  it("1.1 should return 401 Unauthorized if no valid staff session exists", async () => {
    getServerSession.mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/products/bulk");
    const res = await GET(req);
    expect(res.status).toBe(401);

    const postReq = new Request("http://localhost/api/admin/products/bulk", {
      method: "POST",
      body: JSON.stringify({ creates: [] }),
    });
    const postRes = await POST(postReq);
    expect(postRes.status).toBe(401);
  });

  it("1.2 should return 403 Forbidden if user lacks products.view permission", async () => {
    can.mockReturnValue(false);

    const req = new Request("http://localhost/api/admin/products/bulk");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  // =========================================================================
  // 2. GET REQUEST & FILTER SAFETY
  // =========================================================================
  it("2.1 should safely handle invalid or garbage ObjectIds in ?ids= query without crashing", async () => {
    mockFind.mockReturnValue({
      select: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            sort: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      }),
    });

    const req = new Request("http://localhost/api/admin/products/bulk?ids=invalidId123,notAnId,,");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.products).toEqual([]);
  });

  it("2.2 should parse valid 24-character ObjectIds and return populated products", async () => {
    const validId = "660c1f2e8b1d9c001f3a5e10";
    mockFind.mockReturnValue({
      select: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            sort: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([
                  {
                    _id: validId,
                    name: "Test Vape",
                    sku: "TEST-01",
                    price: 29.99,
                    category: "Disposables",
                    status: "Published",
                  },
                ]),
              }),
            }),
          }),
        }),
      }),
    });

    const req = new Request(`http://localhost/api/admin/products/bulk?ids=${validId}`);
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.products.length).toBe(1);
    expect(data.products[0].name).toBe("Test Vape");
    expect(data.products[0]._id).toBe(validId);
  });

  // =========================================================================
  // 3. POST BATCH CREATES (SLUG COLLISIONS & CATEGORY RESOLUTION)
  // =========================================================================
  it("3.1 should handle multiple items with identical names and assign distinct sequential slugs", async () => {
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockImplementation((payload) => Promise.resolve({ _id: "new-id-1", ...payload }));

    const body = {
      creates: [
        { name: "Puff Bar Mint", price: 15.0 },
        { name: "Puff Bar Mint", price: 15.0 },
        { name: "Puff Bar Mint", price: 15.0 },
      ],
    };

    const req = new Request("http://localhost/api/admin/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.createdCount).toBe(3);

    const createdCalls = mockCreate.mock.calls;
    expect(createdCalls[0][0].slug).toBe("puff-bar-mint");
    expect(createdCalls[1][0].slug).toBe("puff-bar-mint-1");
    expect(createdCalls[2][0].slug).toBe("puff-bar-mint-2");
  });

  // =========================================================================
  // 4. POST BATCH UPDATES & IMAGE CLEARING
  // =========================================================================
  it("4.1 should update existing product using $set and clear images array when image is set to empty string", async () => {
    const validId = "660c1f2e8b1d9c001f3a5e20";
    mockFindOneAndUpdate.mockResolvedValue({ _id: validId, name: "Updated Vape" });

    const body = {
      updates: [
        {
          id: validId,
          data: {
            price: 39.99,
            image: "", // Clearing image
          },
        },
      ],
    };

    const req = new Request("http://localhost/api/admin/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const updateCall = mockFindOneAndUpdate.mock.calls[0];
    expect(updateCall[0]._id).toBe(validId);
    expect(updateCall[1].$set.price).toBe(39.99);
    expect(updateCall[1].$set.image).toBe("");
    expect(updateCall[1].$set.images).toEqual([]); // Confirmed images array cleared!
  });

  // =========================================================================
  // 5. POST BATCH DELETES (SOFT DELETE TO TRASH)
  // =========================================================================
  it("5.1 should soft delete valid product IDs with tenant isolation", async () => {
    const validId1 = "660c1f2e8b1d9c001f3a5e31";
    const validId2 = "660c1f2e8b1d9c001f3a5e32";
    mockUpdateMany.mockResolvedValue({ modifiedCount: 2 });

    const body = {
      deletes: [validId1, validId2, "invalid-garbage-id"],
    };

    const req = new Request("http://localhost/api/admin/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.deletedCount).toBe(2);

    const deleteCall = mockUpdateMany.mock.calls[0];
    expect(deleteCall[0]._id.$in).toEqual([validId1, validId2]); // Garbage ID filtered out
    expect(deleteCall[1].$set.isDeleted).toBe(true);
  });
});
