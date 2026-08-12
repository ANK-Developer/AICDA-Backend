import * as memberService from "../services/member.service.js";

export const createMember = async (req, res, next) => {
  try {
    const member = await memberService.createMember(req);
    res.status(201).json({
      success: true,
      message: "Member created successfully",
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllMembers = async (req, res, next) => {
  try {
    const { members, pagination, stats } = await memberService.getAllMembers(req.query);
    res.status(200).json({
      success: true,
      count: members.length,
      pagination,
      stats,
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicMembers = async (req, res, next) => {
  try {
    const members = await memberService.getPublicMembers();
    res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

export const getMemberById = async (req, res, next) => {
  try {
    const member = await memberService.getMemberById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMember = async (req, res, next) => {
  try {
    const member = await memberService.updateMember(req.params.id, req);

    res.status(200).json({
      success: true,
      message: "Member updated successfully",
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleMemberStatus = async (req, res, next) => {
  try {
    const member = await memberService.toggleMemberStatus(req.params.id);

    res.status(200).json({
      success: true,
      message: member.isActive ? "Member activated successfully" : "Member deactivated successfully",
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

export const renewMember = async (req, res, next) => {
  try {
    const member = await memberService.renewMember(req.params.id, req);
    res.status(200).json({
      success: true,
      message: "Member renewed successfully",
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMember = async (req, res, next) => {
  try {
    await memberService.deleteMember(req.params.id);

    res.status(200).json({
      success: true,
      message: "Member deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};