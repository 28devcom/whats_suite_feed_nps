import { useEffect, useMemo, useState } from 'react';
import { Alert, Grid, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageLayout from '../components/PageLayout.jsx';
import BroadcastForm from '../components/BroadcastForm.jsx';
import BroadcastTemplateSelector from '../components/BroadcastTemplateSelector.jsx';
import BroadcastHistory from '../components/BroadcastHistory.jsx';
import BroadcastCampaignDetail from '../components/BroadcastCampaignDetail.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  createBroadcastTemplateApi,
  deleteBroadcastTemplateApi,
  listBroadcastHistoryApi,
  listBroadcastTemplatesApi,
  sendBroadcastApi,
  getBroadcastDetailApi
} from '../api/broadcast.js';
import { listSessionsApi } from '../api/whatsapp.js';
import SkeletonList from '../components/ui/SkeletonList.jsx';

const Broadcast = () => {
  const { apiClientInstance } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [historyPoller, setHistoryPoller] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [tpls, hist, conns] = await Promise.all([
        listBroadcastTemplatesApi(apiClientInstance),
        listBroadcastHistoryApi(apiClientInstance),
        listSessionsApi(apiClientInstance)
      ]);
      setTemplates(tpls || []);
      setHistory(hist || []);
      setConnections(conns || []);
    } finally {
      setLoading(false);
    }
  };

  const refreshHistory = async () => {
    const hist = await listBroadcastHistoryApi(apiClientInstance);
    setHistory(hist || []);
  };

  const handleSend = async (payload) => {
    setSending(true);
    setError(null);
    try {
      await sendBroadcastApi(apiClientInstance, payload);
      await refreshHistory();
    } catch (err) {
      setError(err?.message || 'Error enviando campaña');
    } finally {
      setSending(false);
    }
  };

  const handleTemplateCreate = async (payload) => {
    const tpl = await createBroadcastTemplateApi(apiClientInstance, payload);
    setTemplates((prev) => [tpl, ...prev]);
    return tpl;
  };

  const handleTemplateDelete = async (id) => {
    await deleteBroadcastTemplateApi(apiClientInstance, id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (selectedTemplateId === id) setSelectedTemplateId(null);
  };

  useEffect(() => {
    loadData().catch((err) => setError(err?.message || 'No se pudo cargar broadcast'));
    const timer = setInterval(() => {
      refreshHistory().catch(() => {});
    }, 5000);
    setHistoryPoller(timer);
    return () => {
      if (timer) clearInterval(timer);
      if (historyPoller) clearInterval(historyPoller);
    };
  }, []);

  const openDetail = async (campaign) => {
    try {
      const detail = await getBroadcastDetailApi(apiClientInstance, campaign.id);
      setDetailData(detail);
      setDetailOpen(true);
    } catch (err) {
      setError(err?.message || 'No se pudo cargar detalle');
    }
  };

  return (
    <PageLayout>
      <Stack spacing={2}>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={7} lg={7} sx={{ display: 'flex' }}>
            {loading ? (
              <SkeletonList rows={6} withAvatar={false} />
            ) : (
              <BroadcastForm
                connections={connections}
                selectedTemplate={selectedTemplate}
                onTemplateClear={() => setSelectedTemplateId(null)}
                onSubmit={handleSend}
                sending={sending}
              />
            )}
          </Grid>
          <Grid item xs={12} md={5} lg={5} sx={{ display: 'flex' }}>
            {loading ? (
              <SkeletonList rows={4} withAvatar={false} />
            ) : (
              <BroadcastTemplateSelector
                templates={templates}
                selectedId={selectedTemplateId}
                onSelect={setSelectedTemplateId}
                onCreate={handleTemplateCreate}
                onDelete={handleTemplateDelete}
                busy={sending}
              />
            )}
          </Grid>
        </Grid>

        <BroadcastHistory items={history} loading={loading} onRefresh={refreshHistory} onSelect={openDetail} />

        <BroadcastCampaignDetail open={detailOpen} onClose={() => setDetailOpen(false)} detail={detailData} />
      </Stack>
    </PageLayout>
  );
};

export default Broadcast;
