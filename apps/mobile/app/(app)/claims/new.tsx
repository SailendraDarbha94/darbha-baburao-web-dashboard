import { useRouter } from "expo-router";
import { ClaimForm } from "../../../components/claim-form";
import { createClaim } from "../../../lib/claims";

// Creates a draft, then replaces this screen with the claim's detail so the agent can attach files
// (attachments need a claim id; the form says so in its hint) and submit from there.
export default function NewClaimScreen() {
  const router = useRouter();

  return (
    <ClaimForm
      mode="create"
      onSubmit={async (values) => {
        const claim = await createClaim(values);
        router.replace(`/claims/${claim.id}`);
      }}
    />
  );
}
