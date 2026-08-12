import { useLanguage } from "../../i18n/LanguageContext";

function CompletionReportHistory({ workOrder }) {
  const {
    formatDateTime,
    roleLabel,
    statusLabel,
    t,
    userName,
  } = useLanguage();

  const reportVersions =
    workOrder?.completionReportVersions ?? [];

  if (reportVersions.length === 0) {
    return null;
  }

  return (
      
    <details className="Completion-report-expander">
      <section className="completion-report-history">
        <h3>{t("completionHistory.title")}</h3>

        {reportVersions.map((reportVersion) => (
          <article
            className="completion-report-version"
            key={reportVersion.version}
          >
            <header>
              <h4>
                {t("completionHistory.version")}{" "}
                {reportVersion.version}
              </h4>

              <span>
                {statusLabel(reportVersion.status)}
              </span>
            </header>

            <p>
              <strong>
                {t("completionHistory.submittedBy")}:{" "}
              </strong>

              {userName(
                reportVersion.submittedBy?.userName
              )}
            </p>

            <p>
              <strong>
                {t("completionHistory.role")}:{" "}
              </strong>

              {roleLabel(
                reportVersion.submittedBy?.role
              )}
            </p>

            <p>
              <strong>
                {t("completionHistory.submittedAt")}:{" "}
              </strong>

              {formatDateTime(
                reportVersion.submittedAt
              )}
            </p>

            <hr />

            <p>
              <strong>
                {t("completionHistory.completionDate")}:{" "}
              </strong>

              {reportVersion.report?.completionDate}
            </p>

            <p>
              <strong>
                {t("completionHistory.workPerformed")}:{" "}
              </strong>

              {reportVersion.report?.workPerformed}
            </p>

            <p>
              <strong>
                {t("completionHistory.observations")}:{" "}
              </strong>

              {reportVersion.report?.observations ||
                t("completionHistory.noObservations")}
            </p>

            {reportVersion.rejectionComment && (
              <div className="completion-rejection">
                <h5>
                  {t("completionHistory.rejection")}
                </h5>

                <p>
                  <strong>
                    {t("completionHistory.reason")}:{" "}
                  </strong>

                  {reportVersion.rejectionComment}
                </p>

                <p>
                  <strong>
                    {t("completionHistory.rejectedBy")}:{" "}
                  </strong>

                  {userName(
                    reportVersion.rejectedBy?.userName
                  )}
                </p>

                <p>
                  <strong>
                    {t("completionHistory.rejectedAt")}:{" "}
                  </strong>

                  {formatDateTime(
                    reportVersion.rejectedAt
                  )}
                </p>
              </div>
            )}

            {reportVersion.approvals?.length > 0 && (
              <div className="completion-approvals">
                <h5>
                  {t("completionHistory.approvals")}
                </h5>

                <ul>
                  {reportVersion.approvals.map(
                    (approval) => (
                      <li
                        key={`${reportVersion.version}-${approval.step}`}
                      >
                        {t("completionHistory.step")}{" "}
                        {approval.step}:{" "}
                        {roleLabel(approval.role)} —{" "}
                        {userName(
                          approval.approvedBy?.userName
                        )}{" "}
                        —{" "}
                        {formatDateTime(
                          approval.approvedAt
                        )}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
          </article>
        ))}
      </section>
    </details>    
  );
}

export default CompletionReportHistory;