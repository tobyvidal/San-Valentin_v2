//const apiKey = process.env.APIKEYIMGBB; 
const apiKey = "7179451d8d261a8f7c1e02e8f0c6fa75"; 

// Función para subir imagen a ImgBB
function subirImagen(archivo) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("image", archivo);

        fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const imageUrl = data.data.url;
                const deleteUrl = data.data.delete_url; // URL para eliminar la imagen
                console.log("Imagen subida con éxito:", imageUrl); // Asegúrate de ver esta línea en la consola
                resolve(imageUrl); // Resolvemos la promesa con la URL
            } else {
                reject("Error al subir imagen:", data); // En caso de error en la subida
            }
        })
        .catch(error => reject("Error en la petición:", error)); // Si hay un error en la petición
    });
}


window.subirImagen = subirImagen;
export { subirImagen };
