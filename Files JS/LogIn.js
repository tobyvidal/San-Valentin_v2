// Import the functions you need from the SDKs you need
import { getFirestore, collection, query, orderBy, limit, getDocs, addDoc, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";
import { initializeFirebase } from "./firebase-config.js";

// Inicializa Firebase
const app = initializeFirebase();
const db = getFirestore(app);
const User = collection(db, "Users");

// Función de LogIn
window.LogIn = async () => {
    try {
        const Nombre = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        console.log("Usuario:", Nombre);
        console.log("Contraseña:", password);

        // Consulta a la colección Users buscando coincidencias en Nombre y Password
        const usersQuery = query(User, where("Nombre", "==", Nombre), where("Password", "==", password));
        const querySnapshot = await getDocs(usersQuery);

        if (!querySnapshot.empty) {
            // Si hay coincidencia, obtenemos el ID del usuario
            let userId = 0;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                userId = data.User_Id; // Tomamos el ID del usuario encontrado
            });

            console.log("Login exitoso, User_Id:", userId);
            //Redirigimos y pasamos el ID del usuario como parámetro
            window.location.href = `home.html?User_Id=${encodeURIComponent(userId)}`;
            return userId; // Devuelve el ID del usuario autenticado
        } else {
            console.log("Usuario o contraseña incorrectos");
            return null; // No hay coincidencias
        }
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        return null;
    }
};

