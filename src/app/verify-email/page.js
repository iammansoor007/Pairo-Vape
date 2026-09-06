"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the link.");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Your email has been verified!");
        } else {
          setStatus("error");
          setMessage(data.message || "Verification failed. The link may have expired.");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="max-w-md w-full bg-[#FAF9F6] border border-black/[0.06] rounded-[4px] p-10 shadow-sm text-center space-y-6">
      {/* Logo */}
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-black/40">U Vape Store</p>

      {status === "loading" && (
        <div className="space-y-4">
          <Loader2 className="w-10 h-10 mx-auto text-black animate-spin" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-black">Verifying your email...</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-5">
          <CheckCircle2 className="w-12 h-12 mx-auto text-green-600" />
          <div className="space-y-2">
            <h1 className="text-[18px] font-black uppercase tracking-wider text-black">Email Verified!</h1>
            <p className="text-[11px] text-black font-semibold leading-relaxed">{message}</p>
            <p className="text-[10px] text-black/60 uppercase tracking-widest">Your account is now active.</p>
          </div>
          <Link
            href="/login"
            className="inline-block w-full bg-black text-white py-3.5 rounded-[4px] text-[10px] font-black uppercase tracking-[0.25em] hover:bg-neutral-900 transition-all shadow-sm"
          >
            Sign In to Your Account
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-5">
          <XCircle className="w-12 h-12 mx-auto text-red-500" />
          <div className="space-y-2">
            <h1 className="text-[18px] font-black uppercase tracking-wider text-black">Verification Failed</h1>
            <p className="text-[11px] text-black font-semibold leading-relaxed">{message}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/signup"
              className="inline-block w-full bg-black text-white py-3.5 rounded-[4px] text-[10px] font-black uppercase tracking-[0.25em] hover:bg-neutral-900 transition-all shadow-sm"
            >
              Sign Up Again
            </Link>
            <Link
              href="/login"
              className="inline-block w-full border border-black/15 text-black py-3.5 rounded-[4px] text-[10px] font-black uppercase tracking-[0.25em] hover:bg-neutral-50 transition-all"
            >
              Back to Login
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-center pt-8 pb-20 px-6 font-sans">
      <div className="max-w-md w-full mx-auto">
        <Suspense
          fallback={
            <div className="max-w-md w-full bg-[#FAF9F6] border border-black/[0.06] rounded-[4px] p-10 shadow-sm text-center space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-black/40">U Vape Store</p>
              <Loader2 className="w-10 h-10 mx-auto text-black animate-spin" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-black">Loading...</p>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
