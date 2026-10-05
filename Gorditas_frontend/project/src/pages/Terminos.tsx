import React from 'react';
import { Link } from 'react-router-dom';
import DocumentoLegal, { Dato, Seccion } from '../legal/DocumentoLegal';
import { DATOS_LEGALES as D } from '../legal/datos';

/**
 * Términos del servicio. Los plazos son los del sistema (prueba de 14 días, 15 días por encima del
 * cupo, el ciclo de inactividad): si el código cambia uno, este texto y `VERSION_LEGAL` cambian con él.
 */
const Terminos: React.FC = () => (
  <DocumentoLegal titulo="Términos del servicio">
    <Seccion titulo="1. Aceptación">
      <p>
        Estos términos regulan el uso de Kustodela POS («Kustodela»), que presta <Dato>{D.responsable}</Dato>. Al crear una cuenta
        o usar el sistema aceptas estos términos y el{' '}
        <Link to="/privacidad" className="text-orange-700 underline">
          aviso de privacidad
        </Link>
        . Si los aceptas en nombre de un negocio, declaras que eres mayor de edad y que puedes representarlo.
      </p>
    </Seccion>

    <Seccion titulo="2. El servicio">
      <p>
        Kustodela es un punto de venta en línea para restaurantes que se paga por suscripción: órdenes, cobro, inventario,
        promociones y reportes. Kustodela no emite facturas fiscales (CFDI) a los clientes de tu restaurante ni sustituye tu
        contabilidad: tus obligaciones fiscales siguen siendo tuyas.
      </p>
    </Seccion>

    <Seccion titulo="3. Tu cuenta y tu personal">
      <p>
        Debes dar información verdadera y mantenerla al día. Cuidas tus contraseñas y respondes por lo que hagan en el sistema las
        personas a las que invites. Los administradores de tu restaurante deciden quién entra y qué puede hacer cada persona.
      </p>
    </Seccion>

    <Seccion titulo="4. Prueba gratuita">
      <p>
        Tienes 14 días de prueba gratis, sin tarjeta. Al terminar, el punto de venta queda en pausa hasta que elijas un plan. Tus
        datos se conservan según la sección 8.
      </p>
    </Seccion>

    <Seccion titulo="5. Planes y pagos">
      <ul className="list-disc space-y-2 pl-6">
        <li>
          Los precios están en la página de planes, en pesos mexicanos, y <Dato>{D.ivaEnPrecios}</Dato> IVA. Se cobran por mes
          adelantado con la tarjeta que registres en Stripe y se renuevan solos hasta que canceles.
        </li>
        <li>
          Si cambias de plan, el cambio es inmediato y la diferencia proporcional del mes se ajusta en tu siguiente cobro.
        </li>
        <li>
          Puedes cancelar cuando quieras desde la pantalla de Suscripción. La cancelación surte efecto al final del periodo ya
          pagado y no hay reembolsos por periodos parciales, salvo que la ley disponga otra cosa.
        </li>
        <li>
          Si un cobro es rechazado, Stripe lo reintenta y el sistema te lo avisa. Si el pago no se cubre, el punto de venta queda
          en pausa hasta regularizarlo.
        </li>
        <li>
          Los comprobantes que envía Stripe son recibos de pago, no facturas fiscales. Si necesitas factura (CFDI) de tu
          suscripción, pídela a <Dato>{D.correoContacto}</Dato> dentro del mismo mes del cobro, con tu RFC, nombre o razón
          social, régimen fiscal, código postal y uso del CFDI. Los cobros que no se facturen así se incluyen en la factura
          global al público en general.
        </li>
        <li>Si cambian los precios, te avisaremos por correo con al menos 30 días de anticipación.</li>
      </ul>
    </Seccion>

    <Seccion titulo="6. Límite de usuarios">
      <p>
        Cada plan admite un número de usuarios activos. Si tu restaurante queda por encima del límite —por ejemplo, al bajar de
        plan—, tienes 15 días para ajustarlo. Pasado ese plazo, el sistema desactiva a los usuarios que sobren, sin desactivar
        nunca al último administrador.
      </p>
    </Seccion>

    <Seccion titulo="7. Tu información">
      <p>
        La información de tu restaurante es tuya. Puedes descargar tus reportes en Excel cuando quieras, y te recomendamos
        hacerlo con regularidad. La tratamos conforme al aviso de privacidad.
      </p>
    </Seccion>

    <Seccion titulo="8. Restaurantes sin uso">
      <p>Para no guardar indefinidamente datos que nadie usa, un restaurante sin uso sigue estos pasos:</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] border-collapse text-left">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-3 font-semibold">Días sin uso</th>
              <th className="py-2 pr-3 font-semibold">Prueba que nunca pagó</th>
              <th className="py-2 font-semibold">Suscripción cancelada</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 pr-3">Primer aviso</td>
              <td className="py-2 pr-3">30</td>
              <td className="py-2">365</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-3">Segundo aviso</td>
              <td className="py-2 pr-3">60</td>
              <td className="py-2">395</td>
            </tr>
            <tr>
              <td className="py-2 pr-3">Se archiva</td>
              <td className="py-2 pr-3">90</td>
              <td className="py-2">425</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul className="list-disc space-y-2 pl-6">
        <li>«Uso» es que alguien entre al sistema o registre una orden. Volver a usarlo reinicia el conteo de días.</li>
        <li>Los avisos llegan por correo a los administradores, con al menos 7 días entre un paso y el siguiente.</li>
        <li>Un restaurante con una suscripción pagada nunca se archiva por falta de uso.</li>
        <li>
          Un restaurante archivado deja de funcionar, pero conserva todo. Su administrador puede recuperarlo durante 30 días con
          un solo botón.
        </li>
        <li>
          Pasados esos 30 días podemos borrarlo para siempre: sus datos, sus usuarios y sus archivos. Las copias de seguridad
          cifradas se eliminan en su rotación normal, en un máximo de 12 meses. Lo borrado no se puede recuperar.
        </li>
      </ul>
    </Seccion>

    <Seccion titulo="9. Uso aceptable">
      <p>
        No puedes usar Kustodela para actividades ilegales, intentar entrar a la información de otros restaurantes, afectar el
        funcionamiento del sistema ni revender el servicio sin nuestro permiso por escrito.
      </p>
    </Seccion>

    <Seccion titulo="10. Disponibilidad">
      <p>
        Hacemos lo razonable para que el sistema esté disponible y sus datos respaldados, pero no podemos garantizar que funcione
        sin interrupciones: puede haber mantenimientos y fallas de proveedores o de internet.
      </p>
    </Seccion>

    <Seccion titulo="11. Responsabilidad">
      <p>
        En la medida que la ley lo permita, la responsabilidad de Kustodela por cualquier reclamación se limita a lo que pagaste
        por el servicio en los últimos <Dato>{D.limiteResponsabilidad}</Dato> meses. No respondemos por daños indirectos, como
        ganancias perdidas, ni por decisiones fiscales o comerciales que tomes con la información del sistema.
      </p>
    </Seccion>

    <Seccion titulo="12. Propiedad intelectual">
      <p>El software, la marca y el diseño de Kustodela son nuestros. Te damos un permiso de uso mientras tu suscripción esté vigente.</p>
    </Seccion>

    <Seccion titulo="13. Terminación">
      <p>
        Puedes dejar de usar el servicio cuando quieras. Podemos suspender o cerrar una cuenta que incumpla gravemente estos
        términos, avisándote por correo salvo que exista un riesgo para el sistema o para otros restaurantes.
      </p>
    </Seccion>

    <Seccion titulo="14. Cambios a estos términos">
      <p>
        Si cambiamos estos términos, publicaremos la nueva versión en esta página y avisaremos por correo a los administradores
        con al menos 30 días de anticipación. Si sigues usando el servicio después de esa fecha, aceptas la nueva versión.
      </p>
    </Seccion>

    <Seccion titulo="15. Ley aplicable y contacto">
      <p>
        Estos términos se rigen por las leyes de México. Para cualquier controversia, las partes se someten a los tribunales de{' '}
        <Dato>{D.jurisdiccion}</Dato>. Para dudas escríbenos a <Dato>{D.correoContacto}</Dato>.
      </p>
    </Seccion>
  </DocumentoLegal>
);

export default Terminos;
