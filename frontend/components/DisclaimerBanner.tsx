export default function DisclaimerBanner({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[12px] leading-snug text-warning">
        <strong className="font-semibold text-warning">Notice:</strong> Preliminary planning only — requires
        licensed engineer review before construction.
      </p>
    );
  }
  return (
    <div className="gov-notice px-5 py-4 text-[14px] leading-relaxed">
      <strong className="font-semibold text-info">Important notice.</strong> All designs,
      dimensions, quantities, and costs are conceptual — not final structural drawings or legal
      approval documents. Requires licensed engineers and local authority approval.
    </div>
  );
}
