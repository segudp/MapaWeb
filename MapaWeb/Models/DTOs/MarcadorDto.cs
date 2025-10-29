using System.ComponentModel.DataAnnotations;

namespace MapaWeb.Models.DTOs
{
    // Este es el objeto que tu API va a recibir y enviar.
    // Es simple y coincide con lo que JavaScript va a manejar.
    public class MarcadorDto
    {
        public int? Id { get; set; }
        [Required]
        public string Nombre { get; set; }

        [Required]
        [Range(-90, 90)]
        public double Latitud { get; set; }

        [Required]
        [Range(-180, 180)]
        public double Longitud { get; set; }
    }
}