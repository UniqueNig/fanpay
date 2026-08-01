import React from "react";
import Skeleton from "./Skeleton";

// Generic content-area placeholder shown inside DashboardLayout while
// ProtectedRoute is waiting on the auth check to resolve — approximates the
// common page shape (a heading, a big card, a row of tiles, a list) rather
// than any one specific page, since at this point we don't yet know which
// page's actual data has loaded.
const PageSkeleton = () => (
  <div className="p-5 lg:p-8 max-w-5xl">
    <div className="mb-7">
      <Skeleton className="h-7 w-56 mb-2" />
      <Skeleton className="h-4 w-40" />
    </div>

    <Skeleton className="h-32 w-full rounded-2xl mb-7" />

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>

    <Skeleton className="h-5 w-40 mb-4" />
    <div className="card-flat overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`flex items-center gap-3 p-4 ${i < 2 ? "border-b border-line" : ""}`}>
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-3.5 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  </div>
);

export default PageSkeleton;
