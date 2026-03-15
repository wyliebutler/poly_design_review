"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export type AppSettings = {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
};

const DEFAULT_SETTINGS: AppSettings = {
  appName: "Design Review Portal",
  primaryColor: "#71C6AC", // teal-light
  secondaryColor: "#1B6378", // teal-dark
  logoUrl: "",
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap = settings.reduce((acc, current) => {
      acc[current.key] = current.value;
      return acc;
    }, {} as Record<string, string>);

    return {
      appName: settingsMap["appName"] || DEFAULT_SETTINGS.appName,
      primaryColor: settingsMap["primaryColor"] || DEFAULT_SETTINGS.primaryColor,
      secondaryColor: settingsMap["secondaryColor"] || DEFAULT_SETTINGS.secondaryColor,
      logoUrl: settingsMap["logoUrl"] || DEFAULT_SETTINGS.logoUrl,
    };
  } catch (error) {
    console.error("[SERVER ERROR] Failed to fetch settings:", error);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Unauthorized. Only admins can update settings." };
  }

  const appName = formData.get("appName") as string;
  const primaryColor = formData.get("primaryColor") as string;
  const secondaryColor = formData.get("secondaryColor") as string;
  const logoUrl = formData.get("logoUrl") as string;

  try {
    const updates = [
      { key: "appName", value: appName || DEFAULT_SETTINGS.appName },
      { key: "primaryColor", value: primaryColor || DEFAULT_SETTINGS.primaryColor },
      { key: "secondaryColor", value: secondaryColor || DEFAULT_SETTINGS.secondaryColor },
      { key: "logoUrl", value: logoUrl || "" },
    ];

    // Upsert each setting
    for (const setting of updates) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value },
      });
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("[SERVER ERROR] Failed to update settings:", error);
    return { error: "Failed to save settings in database." };
  }
}
