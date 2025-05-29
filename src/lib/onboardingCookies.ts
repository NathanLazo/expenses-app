"use server";
import { cookies } from "next/headers";

export const setOnboardingCookie = async (onboarding: boolean) => {
  const cookiesObject = await cookies();
  cookiesObject.set("onboarding", onboarding.toString());
};

export const getOnboardingCookie = async () => {
  const cookiesObject = await cookies();
  const onboarding = cookiesObject.get("onboarding")?.value;
  return onboarding;
};
