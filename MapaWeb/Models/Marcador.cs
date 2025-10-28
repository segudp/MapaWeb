using System.ComponentModel.DataAnnotations;
namespace MapaWeb.Models
{
    public class Marcador
    {
        public int Id { get; set; }
        [Required]
        public string Nombre { get; set; }
        [Required]
        public double Latitud { get; set; }
        [Required]
        public double Longitud { get; set; }
    }
}
