// Minimal loading fallback for route-level Suspense
// No logic — just a lightweight spinner centered on screen
const RouteLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-8 h-8 border-2 border-[rgb(var(--primary))] border-t-transparent rounded-full animate-spin" />
  </div>
);

export default RouteLoader;
