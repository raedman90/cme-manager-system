import { Router } from "express";
import {
  listChemicalLots,
  createChemicalLot,
  getChemicalLot,
  updateChemicalLot,
  deleteChemicalLot,
  closeChemicalLot,
} from "../controllers/chemicalLotController";

export const chemicalsRoutes = Router();

// /chemicals/lots
chemicalsRoutes.get("/lots", listChemicalLots);
chemicalsRoutes.post("/lots", createChemicalLot);
chemicalsRoutes.get("/lots/:id", getChemicalLot);
chemicalsRoutes.patch("/lots/:id", updateChemicalLot);
chemicalsRoutes.delete("/lots/:id", deleteChemicalLot);
chemicalsRoutes.post("/lots/:id/close", closeChemicalLot);