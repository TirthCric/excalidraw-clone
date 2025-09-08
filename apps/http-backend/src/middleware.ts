import { JWT_SECRET } from "@repo/backend-common/config";
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    
    try {
        const token = req.headers["authorization"];
        if(!token){
            return res.status(403).json({success: false, message: "Unauthorized"});
        }
        
        const decode = jwt.verify(token, JWT_SECRET);
        
        if(!decode || !(decode as JwtPayload).userId){
            return res.status(403).json({success: false, message: "Unauthorized"});
        } 

        if(!req.body) {
            req.body = {};
        }
        req.body.userId = (decode as JwtPayload).userId;
        next();
    } catch (error) {
        res.status(500).json({success: false, message: "Internal server error"});
        console.log("Error in middleware: ", error);
    }

} 

export default authMiddleware;