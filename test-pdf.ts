import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
const doc = new jsPDF();
doc.text("Hello", 10, 10);
console.log("PDF created successfully");
