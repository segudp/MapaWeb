using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace MapaWeb.Migrations
{
    /// <inheritdoc />
    public partial class DbGeo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Latitud",
                table: "Marcadores");

            migrationBuilder.DropColumn(
                name: "Longitud",
                table: "Marcadores");

            migrationBuilder.AddColumn<Point>(
                name: "Ubicacion",
                table: "Marcadores",
                type: "geography",
                nullable: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Ubicacion",
                table: "Marcadores");

            migrationBuilder.AddColumn<double>(
                name: "Latitud",
                table: "Marcadores",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Longitud",
                table: "Marcadores",
                type: "float",
                nullable: false,
                defaultValue: 0.0);
        }
    }
}
