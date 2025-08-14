import { Router } from "express";
import {
  postWashMetaByCycle,
  postDisinfectionMetaByCycle,
  postSterilizationMetaByCycle,
  postStorageMetaByCycle,
} from "../controllers/stageMetaController";

const router = Router();

// Aliases por ciclo para manter o front que posta em /cycles/:id/stage-meta/:kind
router.post("/:cycleId/stage-meta/wash", postWashMetaByCycle);
router.post("/:cycleId/stage-meta/disinfection", postDisinfectionMetaByCycle);
router.post("/:cycleId/stage-meta/sterilization", postSterilizationMetaByCycle);
router.post("/:cycleId/stage-meta/storage", postStorageMetaByCycle);

export default router;
