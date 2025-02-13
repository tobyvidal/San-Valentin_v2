// Import the functions you need from the SDKs you need
import { getFirestore, collection, query, orderBy, limit, getDocs, addDoc, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";
import { initializeFirebase } from "./firebase-config.js";
import { subirImagen } from './imgbbAPIconfig.js';


// Inicializa Firebase
const app = initializeFirebase();
const db = getFirestore(app);
const imgCollection = collection(db, "Imagenes_Viaje");
const carousel = document.querySelector("#carousel");
let slides = [];
let slideIndex = 0;
let descripcionViajeElement = document.getElementById('descripcionViaje');
// Obtener parámetros de la URL
const params = new URLSearchParams(window.location.search);
const idViaje = Number(params.get("IdViaje")); // Convertir a número
const User_Id = Number(params.get("User_Id")); // Convertir a número
console.log("idViaje:", idViaje);

// Mostrar la imagen y descripción en la página
//document.getElementById("imagenSeleccionada").src = imgSrc;
//document.getElementById("descripcionSeleccionada").textContent = descripcion;


// Función para insertar imagen de viajes
window.insertarImagenDeViaje = async (imagenFile, descrip) => {
    try {
        const imageUrl = await subirImagen(imagenFile); // Esperamos a que la imagen se suba
        console.log("Imagen:", imageUrl);
        const maxIdQuery = query(imgCollection, orderBy("Orden", "desc"), limit(1));
        const querySnapshot = await getDocs(maxIdQuery);

        let nuevoId = 1; // Por defecto, si no hay registros previos
        let nuevoOrden = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            nuevoId = data.Imagen_Id + 1; // Sumar 1 al máximo encontrado
            nuevoOrden = data.Orden + 1;
        });

        // Paso 2: Insertar nuevo registro
        const nuevoDoc = {
            Imagen_Id: nuevoId,
            Img: imageUrl, // Guardar el nombre del archivo (ajústalo según lo que necesitas)
            Orden: nuevoOrden,
            Viaje_Id: idViaje,
            Descrip: descrip,
        };

        await addDoc(imgCollection, nuevoDoc); 
        setTimeout(() => {
            mostrarImagenes();
        }, 3000);
        console.log("Imagen insertada con éxito:", nuevoDoc);
    } catch (error) {
        console.error("Error al insertar imagen:", error);
    }
};

//Funcion para borrar imagen
async function borrarImagen(tabla) {
    debugger;
    const confirmacion = confirm("¿Estás segura de que quieres borrar este recuerdo?");
    if (!confirmacion) {
        console.log("Eliminación cancelada por el usuario.");
        return;
    }
    try {
        let url = obtenerImagenActiva();
        console.log("Buscando imagen para borrar:", url);
        const imgCollection = collection(db, tabla);
        const q = query(
            imgCollection, 
            where("Img", "==", url), 
            where("Viaje_Id", "==", idViaje)
        );
        
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn("No se encontró la imagen en la base de datos.");
            return;
        }

        // Eliminar cada documento que coincida con la URL (en caso de duplicados)
        querySnapshot.forEach(async (documento) => {
            await deleteDoc(doc(db, tabla, documento.id));
            console.log("Imagen eliminada con éxito:", url);
        });

        setTimeout(() => {
            location.reload();
        }, 3000);
        

    } catch (error) {
        console.error("Error al eliminar la imagen:", error);
    }
}

// Llamamos a la función para mostrar imágenes cuando cargue la página
document.addEventListener("DOMContentLoaded", mostrarImagenes);
window.borrarImagen = borrarImagen;

// Botones y modal
const crearViajeBtn = document.getElementById("crearViajeBtn");
const crearViajeModal = document.getElementById("crearViajeModal");
const cerrarModal = document.getElementById("cerrarModal");
const formCrearViaje = document.getElementById("formCrearViaje");

// Abrir modal
crearViajeBtn.addEventListener("click", () => {
  crearViajeModal.style.display = "flex";
});

// Cerrar modal
cerrarModal.addEventListener("click", () => {
  crearViajeModal.style.display = "none";
});

// Enviar formulario
formCrearViaje.addEventListener("submit", (e) => {
  e.preventDefault();

  const descrip = document.getElementById("descrip").value;
  const imagen = document.getElementById('fileInput').files[0];

  insertarImagenDeViaje(imagen, descrip); // Insertar imagen en la base de datos

  // Aquí puedes agregar el código para enviar los datos a Firebase o tu base de datos
  alert("Viaje creado con éxito!");
  crearViajeModal.style.display = "none";
  formCrearViaje.reset();
});

async function mostrarImagenes_1() {
    console.log("Cargando imágenes...");

    const carousel = document.getElementById("carousel");
    const prevButton = document.querySelector(".prev");
    const nextButton = document.querySelector(".next");

    // Limpiar el carrusel antes de agregar nuevas imágenes
    carousel.innerHTML = "";
    descripcionViajeElement.textContent = "";

    try {
        const consulta = query(collection(db, "Imagenes_Viaje"), where("Viaje_Id", "==", idViaje));
        const querySnapshot = await getDocs(consulta);
        
        if (querySnapshot.empty) {
            console.warn("No hay imágenes en la base de datos.");
            // Mostrar la descripción de la última imagen
            descripcionViajeElement.textContent = "El viaje no tiene imagenes, graba recuerdos!";
            return;
        }

        let imageCount = 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log("Imagen encontrada:", data);

            if (data.Img) {
                const slide = document.createElement("div");
                slide.classList.add("carousel-slide");

                const img = document.createElement("img");
                img.src = data.Img;
                img.alt = data.Descrip || "Imagen de viaje";
                img.style.width = "100%";
                slide.appendChild(img);
                slide.setAttribute("data-descripcion", data.Descrip);
                carousel.appendChild(slide);
                imageCount++;
            }
        });

        // Actualiza las imágenes en el carrusel
        slides = document.querySelectorAll(".carousel-slide");

        if (slides.length > 0) {
            slideIndex = slides.length - 1; // Ir a la última imagen
            updateCarousel();
            actualizarImagenActiva();
            
            // Mostrar la descripción de la última imagen
            descripcionViajeElement.textContent = slides[slideIndex].getAttribute("data-descripcion");
        }

        if (imageCount <= 1) {
            prevButton.classList.add("hidden");
            nextButton.classList.add("hidden");
        } else {
            prevButton.classList.remove("hidden");
            nextButton.classList.remove("hidden");
        }

    } catch (error) {
        console.error("Error al obtener imágenes:", error);
    }
}

async function mostrarImagenes() {
    console.log("Cargando imágenes...");

    const carousel = document.getElementById("carousel");
    const prevButton = document.querySelector(".prev");
    const nextButton = document.querySelector(".next");

    // Limpiar el carrusel antes de agregar nuevas imágenes
    carousel.innerHTML = "";
    descripcionViajeElement.textContent = "";

    try {
        const consulta = query(
            collection(db, "Imagenes_Viaje"),
            where("Viaje_Id", "==", idViaje)
        );

        const querySnapshot = await getDocs(consulta);
        
        if (querySnapshot.empty) {
            console.warn("No hay imágenes en la base de datos.");
            descripcionViajeElement.textContent = "El viaje no tiene imágenes, graba recuerdos!";
            return;
        }

        // 🔹 Ordenar manualmente por 'Orden'
        const sortedDocs = querySnapshot.docs
            .map(doc => doc.data())
            .sort((a, b) => b.Orden - a.Orden);

        let imageCount = 0;

        sortedDocs.forEach((data) => {  // 🔥 Ahora usamos `sortedDocs`
            console.log("Imagen encontrada:", data);

            if (data.Img) {
                const slide = document.createElement("div");
                slide.classList.add("carousel-slide");

                const img = document.createElement("img");
                img.src = data.Img;
                img.alt = data.Descrip || "Imagen de viaje";
                img.style.width = "100%";
                slide.appendChild(img);
                slide.setAttribute("data-descripcion", data.Descrip);
                carousel.appendChild(slide);
                imageCount++;
            }
        });

        // Actualiza las imágenes en el carrusel
        slides = document.querySelectorAll(".carousel-slide");

        if (slides.length > 0) {
            slideIndex = slides.length - 1; // Ir a la última imagen
            updateCarousel();
            actualizarImagenActiva();
            
            // Mostrar la descripción de la última imagen
            descripcionViajeElement.textContent = slides[slideIndex].getAttribute("data-descripcion");
        }

        if (imageCount <= 1) {
            prevButton.classList.add("hidden");
            nextButton.classList.add("hidden");
        } else {
            prevButton.classList.remove("hidden");
            nextButton.classList.remove("hidden");
        }

    } catch (error) {
        console.error("Error al obtener imágenes:", error);
    }
}






window.moveSlide = async (step) => {
    
    slideIndex = (slideIndex + step + slides.length) % slides.length; // Cambiar la imagen activa
    updateCarousel();
    actualizarImagenActiva(); // Llamamos a la función que actualiza la clase 'active'
    // Actualizar la imagen activa
    updateCarousel();

    // Actualizar la descripción
    const descripcion = slides[slideIndex].getAttribute("data-descripcion");
    descripcionViajeElement.textContent = descripcion;
}

function updateCarousel() {
    const offset = -slideIndex * 100;
    const carousel = document.querySelector(".carousel");
    carousel.style.transform = `translateX(${offset}%)`;
}

function actualizarImagenActiva() {
    // Elimina la clase 'active' de todos los slides
    slides.forEach(slide => {
        slide.classList.remove("active");
    });

    // Agrega la clase 'active' al slide actual
    slides[slideIndex].classList.add("active");
}

// Cargar las imágenes cuando la página se carga
window.onload = mostrarImagenes;

//Función para obtener imagen activa
function obtenerImagenActiva() {
    const slideActiva = document.querySelector(".carousel-slide.active");
    if (slideActiva) {
        const img = slideActiva.querySelector("img");
        if (img) {
            return img.src; // Retorna la URL de la imagen
        }
    }
    return null; // Si no hay imagen activa, retorna null
}

async function navegar(pestaña){
    console.log(User_Id);
    switch(pestaña){
        case 1:
            window.location.href = `home.html?User_Id=${User_Id}`;
            break;
        case 2:
            window.location.href = `viajes.html?User_Id=${User_Id}`;
            break;
        case 3:
            window.location.href = `momentos.html?User_Id=${User_Id}`;
            break;
        case 4:
            window.location.href = `sobre_ti.html?User_Id=${User_Id}`;
            break;
    }
}

window.navegar = navegar;


