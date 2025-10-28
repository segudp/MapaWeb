using Microsoft.EntityFrameworkCore;
using MapaWeb.Data; // Asegúrate que este sea el namespace de tu AppDbContext


var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

// Add services to the container.
builder.Services.AddControllersWithViews(); // Para tus controladores MVC
builder.Services.AddControllers(); // Para tus controladores de API

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

// Esto mapea las rutas para tus controladores MVC (Vistas)
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

// *** ESTA ES LA LÍNEA QUE FALTABA ***
// Esto mapea las rutas para tus controladores de API
app.MapControllers();

app.Run();