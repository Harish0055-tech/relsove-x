import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [userUsername, setUserUsername] = useState(null);
    const [userFullName, setUserFullName] = useState(null);
    const [userCategory, setUserCategory] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (data._id) {
                    setIsAuthenticated(true);
                    setUserRole(data.role);
                    setUserUsername(data.username);
                    setUserFullName(data.fullName);
                    setUserCategory(data.category || null);
                } else {
                    localStorage.removeItem("token");
                }
            })
            .catch(() => localStorage.removeItem("token"))
            .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (username, password) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        
        if (res.ok) {
            setIsAuthenticated(true);
            setUserRole(data.user.role);
            setUserUsername(data.user.username);
            setUserFullName(data.user.fullName);
            setUserCategory(data.user.category || null);
            localStorage.setItem("token", data.token);
            return { success: true };
        } else {
            return { success: false, message: data.message };
        }
    };

    const register = async (fullName, username, password, role, category) => {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, username, password, role, category })
        });
        const data = await res.json();
        
        if (res.ok) {
            setIsAuthenticated(true);
            setUserRole(data.user.role);
            setUserUsername(data.user.username);
            setUserFullName(data.user.fullName);
            setUserCategory(data.user.category || null);
            localStorage.setItem("token", data.token);
            return { success: true };
        } else {
            return { success: false, message: data.message };
        }
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUserRole(null);
        setUserUsername(null);
        setUserFullName(null);
        setUserCategory(null);
        localStorage.removeItem("token");
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, userRole, userUsername, userFullName, userCategory, loading, login, register, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
