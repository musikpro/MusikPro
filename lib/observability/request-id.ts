import { randomUUID } from "node:crypto";

export function requestId(request: Request) {
  const incoming = request.headers.get("x-request-id")?.trim();
  return incoming && incoming.length <= 128 ? incoming : randomUUID();
}

export function withRequestId(headers: HeadersInit | undefined, id: string) {
  const next = new Headers(headers);
  next.set("x-request-id", id);
  return next;
}
