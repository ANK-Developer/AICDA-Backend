import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
export const isAuthenticated=async(req,res,next)=>{
    try{
        const token=req.cookies.token;
         if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }
    const decoded=jwt.verify(token,process.env.JWT_SECRET);
    const admin=await prisma.admin.findUnique({
        where:{
            id:decoded.id,
        },
    })
     if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin not found",
      });
    }
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated",
      });
    }
      req.admin = admin;
      next();
    }
    catch(error){
           return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
    }
}
