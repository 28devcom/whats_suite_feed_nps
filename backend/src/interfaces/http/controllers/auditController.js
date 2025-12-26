import { getAuditLogs } from '../../../services/auditService.js';

export const listAuditLogsController = async (req, res, next) => {
  try {
    const { limit, action, userId } = req.query;
    const logs = await getAuditLogs({ limit: limit ? Number(limit) : undefined, action, userId });
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

export const exportAuditLogsController = async (req, res, next) => {
  try {
    const logs = await getAuditLogs({ limit: 1000, action: req.query.action, userId: req.query.userId });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
    const header = 'id,user_id,action,resource,resource_id,ip,user_agent,created_at\n';
    const rows = logs
      .map((l) =>
        [l.id, l.user_id, l.action, l.resource, l.resource_id, l.ip, (l.user_agent || '').replace(/\n/g, ' '), l.created_at.toISOString()].map((v) => (v === null || v === undefined ? '' : String(v).replace(/,/g, ';'))).join(',')
      )
      .join('\n');
    res.send(header + rows);
  } catch (err) {
    next(err);
  }
};
