export const authorizeRoles=(...allowedRoles)=>{
    return (req,res,next)=>{
        if(!req.admin){
            return res.status(401).json({
                success:false,
                message: "Authentication required",
            })
        }
if(!allowedRoles.includes(req.admin.role)){
    return res.status(403).json({
                success: false,
        message: "You are not authorized to perform this action",
    })
}

next();



    }
}