import { z } from "zod";

// Expo push tokens look like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx] (or ExpoPushToken[...]).
export const EXPO_PUSH_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[^\]]+\]$/;

/** POST /api/me/push-token. null clears the token (sign-out on a shared device). */
export const pushTokenSchema = z.object({
  expo_push_token: z.string().regex(EXPO_PUSH_TOKEN_PATTERN).nullable(),
});
export type PushTokenInput = z.infer<typeof pushTokenSchema>;
