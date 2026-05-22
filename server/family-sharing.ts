import * as legacy from '../server-legacy/family-sharing.ts';

export const generateAIRecommendations = legacy.generateAIRecommendations;
export const upgradeToPlan = legacy.upgradeToPlan;
export const downgradeFromFamilyPlan = legacy.downgradeFromFamilyPlan;
export const createFamilyGroup = legacy.createFamilyGroup;
export const getFamilyGroups = legacy.getFamilyGroups;
export const updateFamilyGroup = legacy.updateFamilyGroup;
export const deleteFamilyGroup = legacy.deleteFamilyGroup;
export const addFamilyMember = legacy.addFamilyMember;
export const getFamilyMembers = legacy.getFamilyMembers;
export const getFamilyMembersWithSubscriptions = legacy.getFamilyMembersWithSubscriptions;
export const removeFamilyMember = legacy.removeFamilyMember;
export const shareSubscription = legacy.shareSubscription;
export const getSharedSubscriptions = legacy.getSharedSubscriptions;
export const unshareSubscription = legacy.unshareSubscription;
export const setCostSplit = legacy.setCostSplit;
export const getCostSplits = legacy.getCostSplits;
export const createCalendarEvent = legacy.createCalendarEvent;
export const getCalendarEvents = legacy.getCalendarEvents;
export const updateCalendarEvent = legacy.updateCalendarEvent;
export const deleteCalendarEvent = legacy.deleteCalendarEvent;

export default legacy;