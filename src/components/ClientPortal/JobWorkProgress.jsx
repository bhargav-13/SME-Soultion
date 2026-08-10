import React from "react";
import { JOB_WORK_STATUS, formatKg } from "../../utils/clientShop";

/**
 * Per-order-item job work progress: where the item currently is (outside / in
 * house), whether it has come back, and how much weight is still with the job
 * worker. `jobWork` is null for items that were never sent to job work.
 *
 * Ghati (weight burnt off during the process) is only shown when non-zero, but
 * it is always counted against the remaining weight by the backend.
 */
const JobWorkProgress = ({ jobWork }) => {
  if (!jobWork) {
    return <span className="text-sm text-gray-400">-</span>;
  }

  const statusConfig = JOB_WORK_STATUS[jobWork.status] || {
    label: jobWork.status || "Unknown",
    className: "bg-gray-100 text-gray-700",
  };
  const ghatiKg = Number(jobWork.ghatiKg) || 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 whitespace-nowrap">
          {jobWork.typeLabel || jobWork.type || "Job Work"}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${statusConfig.className}`}
        >
          {statusConfig.label}
        </span>
      </div>
      <p className="text-[11px] text-gray-500 whitespace-nowrap">
        Sent {formatKg(jobWork.sentKg)} · Returned {formatKg(jobWork.returnedKg)}
        {ghatiKg > 0 ? ` · Ghati ${formatKg(ghatiKg)}` : ""} · Remaining{" "}
        {formatKg(jobWork.remainingKg)} Kg
      </p>
      {jobWork.finish ? <p className="text-[11px] text-gray-400">{jobWork.finish}</p> : null}
    </div>
  );
};

export default JobWorkProgress;
