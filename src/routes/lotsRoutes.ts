import { Router } from "express";
import {
  getSolutionLotsCtrl,
  postSolutionLotCtrl,
  getSolutionLotCtrl,
  getTestStripLotsCtrl,
  postTestStripLotCtrl,
  getTestStripLotCtrl,
} from "../controllers/lotsController";

const router = Router();

router.get("/solutions", getSolutionLotsCtrl);
router.post("/solutions", postSolutionLotCtrl);
router.get("/solutions/:id", getSolutionLotCtrl);

router.get("/test-strips", getTestStripLotsCtrl);
router.post("/test-strips", postTestStripLotCtrl);
router.get("/test-strips/:id", getTestStripLotCtrl);

export default router;