export function normalizeDashboardPath(pathname: string) {
  return pathname.startsWith("/demo") ? pathname.replace(/^\/demo/, "/dashboard") || "/dashboard" : pathname;
}

export function dashboardHref(route: string, isDemo: boolean) {
  return isDemo && route.startsWith("/dashboard") ? route.replace(/^\/dashboard/, "/demo") || "/demo" : route;
}
