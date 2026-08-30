import { BrowserRouter, Route, Routes } from "react-router-dom";

import RequireAuth from "../auth/RequireAuth";
import Dashboard from "../pages/Dashboard";
import DietPlanCreate from "../pages/DietPlanCreate";
import DietPlanDetail from "../pages/DietPlanDetail";
import DietPlanEdit from "../pages/DietPlanEdit";
import DietPlans from "../pages/DietPlans";
import DietPresetCreate from "../pages/DietPresetCreate";
import DietPresetEdit from "../pages/DietPresetEdit";
import Home from "../pages/Home";
import Inbox from "../pages/Inbox";
import Login from "../pages/Login";
import AuthCallback from "../pages/AuthCallback";
import MyDiet from "../pages/MyDiet";
import Messages from "../pages/Messages";
import NotificationSettings from "../pages/NotificationSettings";
import AdherencePrint from "../pages/AdherencePrint";
import PatientPlanHistory from "../pages/PatientPlanHistory";
import Patients from "../pages/Patients";
import ProfileEdit from "../pages/ProfileEdit";
import ProfileSetup from "../pages/ProfileSetup";
import Register from "../pages/Register";
import Reminders from "../pages/Reminders";
import ShoppingList from "../pages/ShoppingList";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/register" element={<Register />} />
        <Route element={<RequireAuth />}>
          <Route path="/app" element={<Dashboard />} />
          <Route path="/profile/setup" element={<ProfileSetup />} />
          <Route path="/profile/edit" element={<ProfileEdit />} />
          <Route path="/app/dietas" element={<DietPlans />} />
          <Route path="/app/dietas/nova" element={<DietPlanCreate />} />
          <Route path="/app/dietas/presets/novo" element={<DietPresetCreate />} />
          <Route path="/app/dietas/presets/:id/editar" element={<DietPresetEdit />} />
          <Route path="/app/dietas/:id" element={<DietPlanDetail />} />
          <Route path="/app/dietas/:id/editar" element={<DietPlanEdit />} />
          <Route path="/app/pacientes" element={<Patients />} />
          <Route path="/app/minha-dieta" element={<MyDiet />} />
          <Route path="/app/lista-de-compras" element={<ShoppingList />} />
          <Route path="/app/mensagens" element={<Messages />} />
          <Route path="/app/notificacoes" element={<Inbox />} />
          <Route path="/app/notificacoes/preferencias" element={<NotificationSettings />} />
          <Route path="/app/lembretes" element={<Reminders />} />
          <Route path="/app/meus-planos" element={<PatientPlanHistory />} />
          <Route path="/app/relatorio-adesao" element={<AdherencePrint />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
