import { Router, type IRouter } from "express";
import healthRouter from "./health";
import problemRouter from "./problem";
import ideasRouter from "./ideas";
import planRouter from "./plan";
import qcRouter from "./qc";

const router: IRouter = Router();

router.use(healthRouter);
router.use(problemRouter);
router.use(ideasRouter);
router.use(planRouter);
router.use(qcRouter);

export default router;
