/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dao;

import java.sql.DriverManager;
import java.sql.Connection;
import java.sql.SQLException;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Array;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 *
 * @author CharmaineC
 */
public class DB_Controller extends HttpServlet {

    /**
     * Processes requests for both HTTP <code>GET</code> and <code>POST</code>
     * methods.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/json;charset=UTF-8");
        try (PrintWriter out = response.getWriter()) {
            
            try {
                Class.forName("org.postgresql.Driver");
            } catch (ClassNotFoundException e) {
                out.println(e.getMessage());
                return;
            }

            //out.println("PostgreSQL JDBC Driver Registered!");            
            Connection connection = null;
            PreparedStatement ps = null;
            ResultSet rs = null;
            
            try {
                String host = "127.0.0.1";
                String port = "5432";
                String dbName = "postgis20";
                String username = "postgres";
                String password = "password";

                connection = DriverManager.getConnection("jdbc:postgresql://" + host + ":" + port + "/" + dbName, username, password);

                String sql = "SELECT row_to_json(fc) FROM (SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features FROM (SELECT 'Feature' As type, ST_AsGeoJSON(lg.geom)::json As geometry, row_to_json(lp) As properties FROM regions As lg INNER JOIN (SELECT gid, name as Name, descriptio as Description FROM regions) As lp ON lg.gid = lp.gid ) As f)  As fc;";

                ps = connection.prepareStatement(sql);
                rs = ps.executeQuery();
                
                while (rs.next()) {
                    String geojson = rs.getString(1);
                    String geojsonSuffix = geojson.substring(28);
                    String geojsonPrefix = "{\"type\":\"FeatureCollection\",";
                    geojsonPrefix += "\"crs\": { \"type\": \"name\", \"properties\": { \"name\": \"urn:ogc:def:crs:OGC:1.3:CRS84\" } },";
                    geojson = geojsonPrefix + geojsonSuffix;
                            
                    out.println(geojson);                   
                }

            } catch (SQLException e) {
                out.println(e.getMessage());
                return;
            }    
        }
    }

    // <editor-fold defaultstate="collapsed" desc="HttpServlet methods. Click on the + sign on the left to edit the code.">
    /**
     * Handles the HTTP <code>GET</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /**
     * Handles the HTTP <code>POST</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /**
     * Returns a short description of the servlet.
     *
     * @return a String containing servlet description
     */
    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

}
