import React from 'react';
import { Link } from 'react-router-dom';
import DocumentoLegal, { Dato, Seccion } from '../legal/DocumentoLegal';
import { DATOS_LEGALES as D } from '../legal/datos';

/**
 * Aviso de privacidad integral. Describe lo que el sistema hace de verdad: si cambia qué se guarda,
 * con quién se comparte o cuánto se conserva, este texto (y `VERSION_LEGAL`) cambia con él.
 */
const Privacidad: React.FC = () => (
  <DocumentoLegal titulo="Aviso de privacidad">
    <Seccion titulo="1. Quién es responsable de tus datos">
      <p>
        <Dato>{D.responsable}</Dato> (RFC <Dato>{D.rfc}</Dato>), con domicilio en <Dato>{D.domicilio}</Dato>, es responsable de
        los datos personales que se recaban a través de Kustodela POS (en adelante, «Kustodela»). Para cualquier tema de
        privacidad escríbenos a <Dato>{D.correoPrivacidad}</Dato>.
      </p>
    </Seccion>

    <Seccion titulo="2. Qué datos recabamos">
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>De quien registra el restaurante:</strong> nombre, apellido y correo electrónico. La contraseña se guarda
          cifrada en nuestro sistema de inicio de sesión; nadie puede leerla, ni siquiera nosotros.
        </li>
        <li>
          <strong>Del personal que el restaurante invita:</strong> nombre, correo electrónico y su función (administrador,
          encargado, mesero, despachador o cocinero).
        </li>
        <li>
          <strong>Del uso del sistema:</strong> la fecha del último acceso de cada persona y registros técnicos de seguridad
          (como la dirección IP y el navegador) en las bitácoras del servidor.
        </li>
        <li>
          <strong>Del pago de la suscripción:</strong> los datos de tu tarjeta los recibe y guarda directamente Stripe, nuestro
          procesador de pagos. Nosotros solo guardamos el plan, su estado, sus fechas y los identificadores que nos da
          Stripe.
        </li>
      </ul>
      <p>No recabamos datos personales sensibles.</p>
    </Seccion>

    <Seccion titulo="3. Para qué los usamos">
      <p>Usamos tus datos únicamente para dar el servicio que contrataste:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>crear tu cuenta y la de tu personal, y controlar quién entra y qué puede hacer;</li>
        <li>operar el punto de venta: órdenes, cobros, inventario, promociones y reportes;</li>
        <li>cobrar la suscripción y avisarte de su estado;</li>
        <li>
          enviarte los correos propios del servicio: verificación de tu correo, invitaciones, el fin de tu prueba gratuita
          y los avisos por falta de uso antes de archivar tu restaurante;
        </li>
        <li>proteger el sistema, prevenir abusos y cumplir obligaciones legales.</li>
      </ul>
      <p>No usamos tus datos para publicidad ni los vendemos. Si algún día quisiéramos hacerlo, te pediríamos permiso antes.</p>
    </Seccion>

    <Seccion titulo="4. Los datos que tu restaurante registra">
      <p>
        Lo que tu restaurante captura en el sistema —por ejemplo, el nombre de un cliente en una orden para llevar, o los datos
        de tu personal— es información de tu restaurante. Respecto de esos datos, tu restaurante es el responsable y Kustodela
        los trata solo por su cuenta y siguiendo sus instrucciones, para prestarle el servicio.
      </p>
    </Seccion>

    <Seccion titulo="5. Con quién los compartimos">
      <p>Para prestar el servicio nos apoyamos en proveedores que tratan los datos por nuestra cuenta y bajo nuestras instrucciones:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>Stripe, para procesar los pagos de la suscripción;</li>
        <li>
          <Dato>{D.hospedaje}</Dato>, donde funcionan nuestros servidores;
        </li>
        <li>
          <Dato>{D.respaldos}</Dato>, donde guardamos copias de seguridad cifradas;
        </li>
        <li>
          <Dato>{D.correo}</Dato>, para enviar los correos del servicio.
        </li>
      </ul>
      <p>No transferimos tus datos a nadie más, salvo que una autoridad competente lo requiera conforme a la ley.</p>
    </Seccion>

    <Seccion titulo="6. Cuánto tiempo los conservamos">
      <p>
        Mientras tu cuenta esté activa. Si tu restaurante deja de usarse, seguimos los plazos de los{' '}
        <Link to="/terminos" className="text-orange-700 underline">
          términos del servicio
        </Link>
        : te avisamos por correo, después lo archivamos, puedes recuperarlo durante 30 días y, pasado ese plazo, sus datos
        pueden borrarse. Un restaurante con una suscripción pagada nunca se archiva por falta de uso.
      </p>
      <p>
        Cuando borramos un restaurante, sus datos desaparecen de inmediato del sistema. Las copias de seguridad cifradas se
        eliminan solas en su rotación normal, en un máximo de 12 meses. Por seguridad conservamos un registro mínimo de que el
        borrado ocurrió (nombre y subdominio del restaurante, plan y fecha). Stripe conserva los registros de pago que le exige
        la ley.
      </p>
    </Seccion>

    <Seccion titulo="7. Tus derechos (ARCO) y cómo ejercerlos">
      <p>
        Puedes acceder a tus datos, pedir que los corrijamos, que los cancelemos o oponerte a su uso, así como revocar tu
        consentimiento o limitar el uso de tus datos. Escríbenos a <Dato>{D.correoPrivacidad}</Dato> indicando tu nombre, tu
        correo de acceso, el restaurante, lo que pides y, si se trata de una corrección, el dato correcto. Te responderemos en
        un plazo máximo de 20 días hábiles y, si procede, lo haremos efectivo dentro de los 15 días hábiles siguientes.
      </p>
      <p>
        Ten en cuenta que sin algunos datos —como tu correo— no es posible darte el servicio. Si consideras que tu derecho no
        fue atendido, puedes acudir a la autoridad en materia de protección de datos personales.
      </p>
    </Seccion>

    <Seccion titulo="8. Cookies y almacenamiento del navegador">
      <p>
        No usamos cookies de publicidad ni de rastreo. Usamos el almacenamiento de tu navegador y las cookies indispensables del
        inicio de sesión para mantener tu sesión abierta y recordar tu restaurante. Si las borras, solo tendrás que volver a
        iniciar sesión.
      </p>
    </Seccion>

    <Seccion titulo="9. Cambios a este aviso">
      <p>
        Publicaremos cualquier cambio en esta página con su nueva fecha. Si el cambio es importante, también lo avisaremos por
        correo a los administradores de cada restaurante.
      </p>
    </Seccion>
  </DocumentoLegal>
);

export default Privacidad;
