import { Router } from "express";
import multer from "multer";
import {
  listUsers, getUserById, createUser, updateUser, deleteUser, uploadProfilePicture,
} from "../controllers/userController";
import { autenticarJWT } from "../middlewares/authMiddleware"; // seu JWT middleware
import { permitirRoles } from "../middlewares/roleMiddleware"; // checa role ADMIN/TECH
import { verifyBadgeController } from "../controllers/userController"; // ⬅️ certifique-se de exportar

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
router.post("/verify-badge", autenticarJWT, permitirRoles("ADMIN", "TECH"), verifyBadgeController);
// somente ADMIN gerencia usuários
router.use(autenticarJWT, permitirRoles("ADMIN"));

router.get("/", listUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);
router.post("/:id/profile-picture", upload.single("file"), uploadProfilePicture);
router.post("/:id/avatar", permitirRoles("ADMIN"), upload.single("file"), uploadProfilePicture);

export default router;
