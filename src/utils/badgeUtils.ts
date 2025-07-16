import fs from "fs";
import path from "path";
import axios from "axios";

/**
 * Downloads a team badge from Sofascore and writes it to disk.
 *
 * @param team - an object with `id` (Sofascore team ID) and `slug` (filename-friendly name)
 * @param outputDir - where to save the badges (will be created if missing)
 */
export async function downloadTeamBadge(
  team: { id: number; slug: string },
  outputDir: string = path.resolve(process.cwd(), "badges")
): Promise<void> {
  const url = `https://img.sofascore.com/api/v1/team/${team.id}/image`;

  // ensure the output directory exists
  await fs.promises.mkdir(outputDir, { recursive: true });

  // fetch as binary
  const response = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
  });

  // write to `<outputDir>/<slug>.png`
  const filePath = path.join(outputDir, `${team.slug}.png`);
  await fs.promises.writeFile(filePath, Buffer.from(response.data));

  console.log(`✅ Saved badge for ${team.slug} → ${filePath}`);
}
