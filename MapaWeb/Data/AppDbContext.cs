using MapaWeb.Models;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace MapaWeb.Data
{
    public class AppDbContext: DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
        {
        }
        public DbSet<Marcador> Marcadores { get; set; }
    }
}
