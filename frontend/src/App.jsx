import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import KitchenDashboard from "./pages/KitchenDashboard";
import FoodManagement from "./pages/FoodManagement";
import TableQR from "./pages/TableQR";
import Menu from "./pages/Menu";
import Checkout from "./pages/Checkout";
import OrderStatus from "./pages/OrderStatus";
import Register from "./pages/Register";
import RestaurantSettings from "./pages/RestaurantSettings";
import StaffManagement from "./pages/StaffManagement";
import Home from "./pages/Home";
import Subscription from "./pages/Subscription";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC */}
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/subscription"
          element={<Subscription />}
        />

        <Route
          path="/order/:tableId"
          element={<Menu />}
        />

        <Route
          path="/checkout/:tableId"
          element={<Checkout />}
        />

        <Route
          path="/order-status"
          element={<OrderStatus />}
        />
        <Route 
        path="/register" 
        element={<Register />} 
        />

        {/* PROTECTED */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/kitchen"
          element={
            <ProtectedRoute allowedRoles={["admin","staff"]}>
              <KitchenDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/foods"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <FoodManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tables"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <TableQR />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <StaffManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <RestaurantSettings />
            </ProtectedRoute>
          }
       />

      </Routes>
    </BrowserRouter>
  );
}

export default App;