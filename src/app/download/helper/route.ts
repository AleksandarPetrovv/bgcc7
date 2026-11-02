import path from "node:path";
import { UPLOAD_DIR } from "@/lib/uploads";
import { fileDownload } from "@/lib/download";

export async function GET() {
  return fileDownload(path.join(UPLOAD_DIR, "helper", "BGCC7 Helper.msi"), "BGCC7 Helper.msi", "application/x-msi");
}
