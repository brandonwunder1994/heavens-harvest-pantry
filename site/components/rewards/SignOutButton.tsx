import { signOutOfRewards } from "@/app/(shop)/rewards/actions";

export function SignOutButton() {
  return (
    <form action={signOutOfRewards}>
      <button
        type="submit"
        className="font-ui text-[13px] text-brown underline underline-offset-4 hover:text-brown-deep"
      >
        Sign out of this device
      </button>
    </form>
  );
}
