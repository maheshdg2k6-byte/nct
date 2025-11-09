import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

export function useTradeActions() {
  const navigate = useNavigate();
  const [showAddTrade, setShowAddTrade] = useState(false);

  const addTrade = () => {
    setShowAddTrade(true);
  };

  const viewAllTrades = () => {
    navigate('/journal');
    toast({
      title: "Navigating to Journal",
      description: "View all your trades in the journal page.",
    });
  };

  const viewCalendar = () => {
    navigate('/calendar');
  };

  const viewAnalytics = () => {
    navigate('/analytics');
  };

  const viewPlaybooks = () => {
    navigate('/playbooks');
  };

  return {
    addTrade,
    viewAllTrades,
    viewCalendar,
    viewAnalytics,
    viewPlaybooks,
    showAddTrade,
    setShowAddTrade
  };
}