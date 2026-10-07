"use client";

import { adminForgetFailure } from "@/app/actions/adminForgetFailure";
import { adminResolveTakedown } from "@/app/actions/adminResolveTakedown";
import { adminWithdrawVersion } from "@/app/actions/adminWithdrawVersion";
import { ConfirmAction } from "./ConfirmAction";

// The action buttons in the admin tables. Each runs a server action that checks the session again.
export function WithdrawButton({ versionId }: { versionId: string }) {
  return <ConfirmAction label="Withdraw" confirm="Withdraw for good?" run={() => adminWithdrawVersion(versionId)} />;
}

export function TakedownButtons({ id }: { id: number }) {
  return (
    <span className="flex gap-1.5">
      <ConfirmAction label="Action" confirm="Block site + withdraw?" run={() => adminResolveTakedown(id, "action")} />
      <ConfirmAction label="Reject" confirm="Reject request?" tone="neutral" run={() => adminResolveTakedown(id, "reject")} />
    </span>
  );
}

export function ForgetButton({ sourceUrl }: { sourceUrl: string }) {
  return <ConfirmAction label="Allow retry" confirm="Forget failure?" tone="neutral" run={() => adminForgetFailure(sourceUrl)} />;
}
