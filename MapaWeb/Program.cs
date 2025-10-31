// Program.cs

using Microsoft.EntityFrameworkCore;
using MapaWeb.Data;
using NetTopologySuite;
using NetTopologySuite.Geometries; // <-- Asegurate de tener este
using NetTopologySuite.IO.Converters;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// --- 1. Definí tu fábrica UNA SOLA VEZ ---
var geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

// --- 2. Registrala como Singleton ---
builder.Services.AddSingleton(geometryFactory);

// --- 3. Configura el DbContext ---
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        connectionString,
        sqlOptions => sqlOptions.UseNetTopologySuite()
    )
);

// --- 4. Configura los JSON (esto usa la fábrica que creamos) ---
builder.Services.AddControllersWithViews()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new GeoJsonConverterFactory(geometryFactory)); // <-- Usa la variable
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

var app = builder.Build();

// ... (El resto de tu Program.cs sigue igual) ...

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.MapControllers();

app.Run();