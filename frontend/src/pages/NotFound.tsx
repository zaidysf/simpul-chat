import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { BRAND_NAME } from "@/lib/branding";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <img src="/simpul.png" alt={BRAND_NAME} className="h-full w-full object-contain" />
        </div>
        <h1 className="mb-2 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">Oops! We can’t find that page.</p>
        <a href="/" className="font-medium text-primary hover:underline">
          Return to {BRAND_NAME}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
