import { Router } from "express";
import {
  postWashMeta,
  postDisinfectionMeta,
  postSterilizationMeta,
  postStorageMeta,
} from "../controllers/stageMetaController";

const router = Router();

// Todas recebem o ID do StageEvent (não do ciclo!)
// Ex.: POST /stage-events/evt_123/wash
router.post("/:id/wash", postWashMeta);
router.post("/:id/disinfection", postDisinfectionMeta);
router.post("/:id/sterilization", postSterilizationMeta);
router.post("/:id/storage", postStorageMeta);

export default router;
