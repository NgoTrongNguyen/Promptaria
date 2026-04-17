export async function CallAPI(Matrix) {
    const response = await fetch("http://localhost:8000/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            Matrix: Matrix
        })
    });

    const data = await response.json();
    return data;
}