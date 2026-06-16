import { Router, type IRouter } from "express";
import healthRouter from "./health";
import problemRouter from "./problem";
import ideasRouter from "./ideas";
import planRouter from "./plan";

const router: IRouter = Router();

router.use(healthRouter);
router.use(problemRouter);
router.use(ideasRouter);
router.use(planRouter);

export default router;
