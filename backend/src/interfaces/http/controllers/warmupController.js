import asyncHandler from '../middlewares/asyncHandler.js';
import {
  getWarmupStatus,
  startWarmup,
  pauseWarmup,
  resumeWarmup,
  setSimulation,
  runWarmupCycle,
  listWarmupLines,
  getWarmupSelection,
  updateWarmupSelection
} from '../../../modules/warmup/warmupManager.js';

export const status = asyncHandler(async (req, res) => {
  const data = getWarmupStatus();
  res.json(data);
});

export const start = asyncHandler(async (req, res) => {
  const data = await startWarmup();
  res.json(data);
});

export const pause = asyncHandler(async (req, res) => {
  const data = await pauseWarmup();
  res.json(data);
});

export const resume = asyncHandler(async (req, res) => {
  const data = await resumeWarmup();
  res.json(data);
});

export const simulate = asyncHandler(async (req, res) => {
  const { simulate = false } = req.body || {};
  const data = await setSimulation(simulate);
  res.json(data);
});

export const runCycle = asyncHandler(async (req, res) => {
  const data = await runWarmupCycle();
  res.json(data);
});

export const lines = asyncHandler(async (req, res) => {
  const data = await listWarmupLines();
  res.json({ items: data });
});

export const selection = asyncHandler(async (req, res) => {
  const data = await getWarmupSelection();
  res.json(data);
});

export const setSelection = asyncHandler(async (req, res) => {
  const { allow = [], deny = [] } = req.body || {};
  const data = await updateWarmupSelection({ allow, deny });
  res.json(data);
});
